import jwt from "jsonwebtoken";

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: "Thiếu token" });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // payload: { user_id, email }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
  };
}
