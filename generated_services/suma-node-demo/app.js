const express = require("express");
const app = express();

app.get("/sumar", (req, res) => {
  // FIX: usar Number() + ?? para distinguir 0 de ausencia del parámetro
  const a = Number(req.query.a ?? 0);
  const b = Number(req.query.b ?? 0);
  res.json({ a, b, resultado: a + b });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Microservicio corriendo en puerto 3000");
});
