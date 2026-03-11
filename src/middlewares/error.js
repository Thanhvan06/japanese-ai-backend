export function errorHandler(err, req, res, next) {
  console.error("Error:", err);
  console.error("Stack:", err.stack);
  
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  
  // In development, show more details
  const isDevelopment = process.env.NODE_ENV !== "production";
  res.status(500).json({ 
    message: err.message || "Internal Server Error",
    ...(isDevelopment && { 
      stack: err.stack,
      error: err.toString()
    })
  });
}
