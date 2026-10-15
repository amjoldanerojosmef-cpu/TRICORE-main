module.exports = {
  proxy: "127.0.0.1:8000",
  host: "0.0.0.0",
  port: 3000,
  files: ["./*.html", "./*.css", "./*.js", "./server.php"],
  open: false,
  notify: false,
};
