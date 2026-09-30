import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import CustomerProfile from "../models/CustomerProfile.js";
import RegistrationOtp from "../models/RegistrationOtp.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  hashPassword,
  checkPassword,
  createAccessToken,
  createRefreshToken,
  hashToken,
  publicUser,
} from "../utils/auth.js";
import { auth } from "../middleware/auth.js";

const r = Router();
const otp = () => String(Math.floor(100000 + Math.random() * 900000));
const normalizeMobile = (v = "") => {
  const raw = String(v).trim().replace(/[\s-]/g, "");
  if (/^\+91\d{10}$/.test(raw)) return raw;
  if (/^91\d{10}$/.test(raw)) return `+${raw}`;
  if (/^\d{10}$/.test(raw)) return `+91${raw}`;
  return raw;
};
const mobileCandidates = (v = "") => {
  const n = normalizeMobile(v),
    d = n.replace(/^\+/, "");
  return [...new Set([String(v).trim(), n, d, d.replace(/^91/, "")])];
};
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/api/auth",
  maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 86400000,
});
async function issueSession(user, req, res) {
  const raw = createRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(
      Date.now() + Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 86400000,
    ),
    userAgent: req.get("user-agent") || "",
    ip: req.ip || "",
  });
  res.cookie("workforce_refresh", raw, cookieOptions());
  return createAccessToken(user);
}
async function revokeAll(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() },
  );
}
async function sendSms(to, code, purpose) {
  console.log(`[WORKFORCE OTP:${purpose}] ${to}: ${code}`);
  return { sent: true, local: true };
}
const registrationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "image")
      return cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
    cb(null, /^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.mimetype));
  },
});

r.post(
  "/register/request-otp",
  registrationUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "experienceDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, mobile, email, password, age, gender } = req.body;
      const role = ["customer", "worker"].includes(req.body.role)
        ? req.body.role
        : "customer";
      const normalized = normalizeMobile(mobile);
      const em = String(email || "")
        .toLowerCase()
        .trim();
      const files = req.files || {};
      const image = files.image?.[0];
      if (!name || !mobile || !email || !password)
        return res
          .status(400)
          .json({ message: "Name, mobile, email and password are required" });
      if (role === "worker" && !image)
        return res.status(400).json({ message: "Worker selfie is required" });
      if (!/^\+91\d{10}$/.test(normalized))
        return res
          .status(400)
          .json({ message: "Enter a valid 10 digit Indian mobile number" });
      if (password.length < 6)
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      const workerFields = role === "worker";
      const skillNames = String(req.body.skillNames || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 30);
      const experienceYears = Number(req.body.experienceYears || 0);
      if (
        workerFields &&
        (!String(req.body.profession || "").trim() ||
          !skillNames.length ||
          !Number.isFinite(experienceYears) ||
          experienceYears < 0)
      )
        return res
          .status(400)
          .json({
            message:
              "Worker profession, at least one skill and valid experience are required",
          });
      const verificationFiles = [];
      if (workerFields) {
        if (!files.idDocument?.[0])
          return res
            .status(400)
            .json({
              message: "Aadhaar / ID document is required for Worker signup",
            });
        const groups = [
          ["id", "idDocument"],
          ["experience_certificate", "experienceDocument"],
        ];
        for (const [type, key] of groups) {
          for (const file of files[key] || []) {
            const stored = await (
              await import("../services/storage.js")
            ).putPrivate(file.buffer, file.mimetype, file.originalname);
            verificationFiles.push({
              type,
              fileName: file.originalname,
              contentType: file.mimetype,
              size: file.size,
              storageKey: stored.key,
              data: file.buffer,
            });
          }
        }
        if (!verificationFiles.some((d) => d.type === "id"))
          return res
            .status(400)
            .json({
              message: "Aadhaar / ID document is required for Worker signup",
            });
      }
      const existing = await User.findOne({
        $or: [{ email: em }, { mobile: { $in: mobileCandidates(normalized) } }],
      });
      if (existing)
        return res.status(409).json({ message: "Account already exists" });
      await RegistrationOtp.deleteMany({
        $or: [{ email: em }, { mobile: { $in: mobileCandidates(normalized) } }],
      });
      const code = otp();
      const pending = await RegistrationOtp.create({
        name,
        mobile: normalized,
        age: Number(age) || 18,
        gender: ["male", "female", "other"].includes(gender) ? gender : "other",
        email: em,
        passwordHash: await hashPassword(password),
        otpHash: await bcrypt.hash(code, 10),
        otpExpiresAt: new Date(
          Date.now() + Number(process.env.OTP_TTL_MINUTES || 10) * 60000,
        ),
        imageData: image.buffer,
        imageContentType: image.mimetype,
        role,
        profession: String(req.body.profession || "").trim(),
        skillNames,
        experienceYears,
        district: String(req.body.district || "").trim(),
        taluka: String(req.body.taluka || "").trim(),
        city: String(req.body.city || "").trim(),
        area: String(req.body.area || "").trim(),
        bio: String(req.body.bio || "").trim(),
        languages: String(req.body.languages || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 10),
        verificationUploads: verificationFiles,
      });
      await sendSms(normalized, code, "registration");
      // res.json({
      //   message: "OTP generated successfully",
      //   registrationId: String(pending._id),
      //   devOtp: process.env.NODE_ENV === "production" ? undefined : code,
      // });
res.json({
  message: "OTP generated successfully",
  devOtp: code,
});
    } catch (e) {
      res
        .status(500)
        .json({ message: e.message || "Unable to send registration OTP" });
    }
  },
);

r.post("/register/verify-otp", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "");
    const pending = await RegistrationOtp.findOne({
      $or: [
        { mobile: { $in: mobileCandidates(identifier) } },
        { email: identifier.toLowerCase() },
      ],
    }).sort({ createdAt: -1 });
    if (
      !pending ||
      pending.otpExpiresAt < new Date() ||
      !(await bcrypt.compare(req.body.code || "", pending.otpHash))
    )
      return res.status(401).json({ message: "Invalid or expired OTP" });
    const existing = await User.findOne({
      $or: [
        { email: pending.email },
        { mobile: { $in: mobileCandidates(pending.mobile) } },
      ],
    });
    if (existing)
      return res.status(409).json({ message: "Account already exists" });
    const u = await User.create({
      name: pending.name,
      mobile: normalizeMobile(pending.mobile),
      age: pending.age,
      gender: pending.gender,
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: pending.role || "customer",
      profileImageData: pending.imageData || null,
      profileImageContentType: pending.imageContentType || "",
      profileImage: "",
    });
    if (pending.imageData?.length) {
      u.profileImage = `/api/profile/image/${u._id}`;
      await u.save();
    }
    if (u.role === "worker") {
      await WorkerProfile.create({
        user: u._id,
        headline: pending.profession,
        bio: pending.bio,
        skillNames: pending.skillNames,
        experienceYears: pending.experienceYears,
        district: pending.district,
        taluka: pending.taluka,
        city: pending.city,
        area: pending.area,
        languages: pending.languages,
        verificationStatus: "pending",
      });
      if (pending.verificationUploads?.length) {
        const { default: VerificationDocument } =
          await import("../models/VerificationDocument.js");
        await VerificationDocument.insertMany(
          pending.verificationUploads.map((d) => ({
            worker: u._id,
            type: d.type,
            fileName: d.fileName,
            contentType: d.contentType,
            size: Number(d.size) || 0,
            storageKey: d.storageKey || "",
            data: null,
            status: "pending",
          })),
        );
      }
    } else await CustomerProfile.create({ user: u._id });
    await RegistrationOtp.deleteMany({
      $or: [{ email: pending.email }, { mobile: pending.mobile }],
    });
    const token = await issueSession(u, req, res);
    const workerProfile =
      u.role === "worker"
        ? await WorkerProfile.findOne({ user: u._id }).select(
            "verificationStatus verificationRejectionReason",
          )
        : null;
    const user = publicUser(u);
    if (workerProfile) {
      user.verificationStatus =
        workerProfile.verificationStatus === "approved"
          ? "verified"
          : workerProfile.verificationStatus;
      user.verificationRejectionReason =
        workerProfile.verificationRejectionReason || "";
    }
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: e.message || "Registration failed" });
  }
});

r.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const u = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: { $in: mobileCandidates(identifier) } },
      ],
    });
    if (!u || !(await checkPassword(req.body.password || "", u.passwordHash)))
      return res.status(401).json({ message: "Invalid login details" });
    if (["blocked", "inactive"].includes(u.status))
      return res.status(403).json({ message: "This account is not active" });
    u.lastLoginAt = new Date();
    await u.save();
    const token = await issueSession(u, req, res);
    const extra =
      u.role === "worker"
        ? await WorkerProfile.findOne({ user: u._id }).select(
            "verificationStatus verificationRejectionReason",
          )
        : null;
    const user = publicUser(u);
    if (extra) {
      user.verificationStatus =
        extra.verificationStatus === "approved"
          ? "verified"
          : extra.verificationStatus;
      user.verificationRejectionReason =
        extra.verificationRejectionReason || "";
    }
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: e.message || "Login failed" });
  }
});

r.post("/otp/request", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const u = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: { $in: mobileCandidates(identifier) } },
      ],
    });
    if (!u) return res.status(404).json({ message: "Account not found" });
    const code = otp();
    u.otpHash = await bcrypt.hash(code, 10);
    u.otpExpiresAt = new Date(
      Date.now() + Number(process.env.OTP_TTL_MINUTES || 10) * 60000,
    );
    await u.save();
    await sendSms(u.mobile, code, "login");
    res.json({
      message: "OTP generated successfully",
      devOtp: process.env.NODE_ENV === "production" ? undefined : code,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || "Unable to generate OTP" });
  }
});
r.post("/otp/verify", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const u = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: { $in: mobileCandidates(identifier) } },
      ],
    });
    if (
      !u ||
      !u.otpHash ||
      u.otpExpiresAt < new Date() ||
      !(await bcrypt.compare(req.body.code || "", u.otpHash))
    )
      return res.status(401).json({ message: "Invalid or expired OTP" });
    if (["blocked", "inactive"].includes(u.status))
      return res.status(403).json({ message: "This account is not active" });
    u.otpHash = "";
    u.otpExpiresAt = null;
    u.lastLoginAt = new Date();
    await u.save();
    const token = await issueSession(u, req, res);
    const extra =
      u.role === "worker"
        ? await WorkerProfile.findOne({ user: u._id }).select(
            "verificationStatus verificationRejectionReason",
          )
        : null;
    const user = publicUser(u);
    if (extra) {
      user.verificationStatus =
        extra.verificationStatus === "approved"
          ? "verified"
          : extra.verificationStatus;
      user.verificationRejectionReason =
        extra.verificationRejectionReason || "";
    }
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: e.message || "OTP verification failed" });
  }
});

r.post("/password/forgot", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const u = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: { $in: mobileCandidates(identifier) } },
      ],
    });
    if (!u) return res.status(404).json({ message: "Account not found" });
    const code = otp();
    u.otpHash = await bcrypt.hash(code, 10);
    u.otpExpiresAt = new Date(
      Date.now() + Number(process.env.OTP_TTL_MINUTES || 10) * 60000,
    );
    await u.save();
    await sendSms(u.mobile, code, "password reset");
    res.json({
      message: "OTP generated successfully",
      devOtp: process.env.NODE_ENV === "production" ? undefined : code,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || "Unable to send reset OTP" });
  }
});
r.post("/password/verify-otp", async (req, res) => {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code)
      return res
        .status(400)
        .json({ message: "Identifier and OTP are required" });
    const u = await User.findOne({
      $or: [
        { email: String(identifier).toLowerCase() },
        { mobile: { $in: mobileCandidates(identifier) } },
      ],
    });
    if (
      !u ||
      !u.otpHash ||
      !u.otpExpiresAt ||
      u.otpExpiresAt < new Date() ||
      !(await bcrypt.compare(String(code), u.otpHash))
    )
      return res.status(401).json({ message: "Invalid or expired OTP" });
    res.json({ ok: true, message: "OTP verified" });
  } catch (e) {
    res.status(500).json({ message: e.message || "OTP verification failed" });
  }
});

r.post("/password/reset", async (req, res) => {
  try {
    const { identifier, code, password } = req.body;
    if (!identifier || !code || !password || password.length < 6)
      return res
        .status(400)
        .json({ message: "Identifier, OTP and new password are required" });
    const u = await User.findOne({
      $or: [
        { email: String(identifier).toLowerCase() },
        { mobile: { $in: mobileCandidates(identifier) } },
      ],
    });
    if (
      !u ||
      !u.otpHash ||
      !u.otpExpiresAt ||
      u.otpExpiresAt < new Date() ||
      !(await bcrypt.compare(String(code), u.otpHash))
    )
      return res.status(401).json({ message: "Invalid or expired OTP" });
    u.passwordHash = await hashPassword(password);
    u.otpHash = "";
    u.otpExpiresAt = null;
    await u.save();
    await revokeAll(u._id);
    res.json({ message: "Password reset successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message || "Password reset failed" });
  }
});
r.post("/password/change", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    if (!(await checkPassword(currentPassword || "", req.user.passwordHash)))
      return res.status(401).json({ message: "Current password is incorrect" });
    req.user.passwordHash = await hashPassword(newPassword);
    await req.user.save();
    await revokeAll(req.user._id);
    res.json({ message: "Password changed successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message || "Password change failed" });
  }
});
r.post("/me/contact-otp", auth, async (req, res) => {
  try {
    const code = otp();
    req.user.otpHash = await bcrypt.hash(code, 10);
    req.user.otpExpiresAt = new Date(
      Date.now() + Number(process.env.OTP_TTL_MINUTES || 10) * 60000,
    );
    await req.user.save();
    await sendSms(req.user.mobile, code, "contact change");
    // res.json({
    //   message: "OTP generated successfully",
    //   devOtp: process.env.NODE_ENV === "production" ? undefined : code,
    // });
    res.json({
  message: 'OTP generated successfully',
  devOtp: code
});
  } catch (e) {
    res.status(500).json({ message: e.message || "Unable to generate OTP" });
  }
});
r.post("/refresh", async (req, res) => {
  try {
    const raw = req.cookies?.workforce_refresh;
    if (!raw)
      return res.status(401).json({ message: "Refresh session not found" });
    const current = await RefreshToken.findOne({
      tokenHash: hashToken(raw),
      revokedAt: null,
    }).populate("user");
    if (!current || current.expiresAt < new Date() || !current.user) {
      res.clearCookie("workforce_refresh", {
        ...cookieOptions(),
        maxAge: undefined,
      });
      return res.status(401).json({ message: "Refresh session expired" });
    }
    current.revokedAt = new Date();
    await current.save();
    const token = await issueSession(current.user, req, res);
    const extra =
      current.user.role === "worker"
        ? await WorkerProfile.findOne({ user: current.user._id }).select(
            "verificationStatus verificationRejectionReason",
          )
        : null;
    const user = publicUser(current.user);
    if (extra) {
      user.verificationStatus =
        extra.verificationStatus === "approved"
          ? "verified"
          : extra.verificationStatus;
      user.verificationRejectionReason =
        extra.verificationRejectionReason || "";
    }
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: e.message || "Refresh failed" });
  }
});
r.post("/logout", async (req, res) => {
  try {
    const raw = req.cookies?.workforce_refresh;
    if (raw)
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashToken(raw), revokedAt: null },
        { revokedAt: new Date() },
      );
    res.clearCookie("workforce_refresh", {
      ...cookieOptions(),
      maxAge: undefined,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message || "Logout failed" });
  }
});
r.get("/me", auth, async (req, res) => {
  const extra =
    req.user.role === "worker"
      ? await WorkerProfile.findOne({ user: req.user._id }).select(
          "verificationStatus verificationRejectionReason",
        )
      : null;
  const user = publicUser(req.user);
  if (extra) {
    user.verificationStatus =
      extra.verificationStatus === "approved"
        ? "verified"
        : extra.verificationStatus;
    user.verificationRejectionReason = extra.verificationRejectionReason;
  }
  res.json({ user });
});
r.put("/me", auth, async (req, res) => {
  try {
    const { name, email, mobile, otp: code } = req.body;
    const nextEmail =
      email !== undefined
        ? String(email).trim().toLowerCase()
        : req.user.email || "";
    const nextMobile =
      mobile !== undefined ? normalizeMobile(mobile) : req.user.mobile || "";
    const changed =
      nextEmail !== (req.user.email || "").toLowerCase() ||
      nextMobile !== (req.user.mobile || "");
    if (changed) {
      if (
        !code ||
        !req.user.otpHash ||
        req.user.otpExpiresAt < new Date() ||
        !(await bcrypt.compare(String(code), req.user.otpHash))
      )
        return res
          .status(401)
          .json({ message: "Valid OTP is required for mobile/email changes" });
      req.user.otpHash = "";
      req.user.otpExpiresAt = null;
    }
    if (name !== undefined) req.user.name = String(name).trim();
    if (email !== undefined) req.user.email = nextEmail;
    if (mobile !== undefined) req.user.mobile = nextMobile;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (e) {
    res.status(400).json({ message: e.message || "Profile update failed" });
  }
});
export default r;
