let d = "";
process.stdin.on("data", (c) => (d += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(d);
    const file = (input.tool_input && input.tool_input.file_path) || "";
    if (!file || !/\.tsx$/.test(file) || !/apps[\\/]frontend/.test(file)) return;

    const fs = require("fs");
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch (e) {
      return;
    }

    const banned = /\b(?:bg|text|border|from|to|via|ring|fill|stroke)-(?:slate|gray|zinc|indigo|emerald|rose)-\d+\b/g;
    const matches = content.match(banned);
    if (matches && matches.length) {
      const unique = [...new Set(matches)];
      process.stdout.write(
        JSON.stringify({
          systemMessage:
            "Pocket Mint design system: banned Tailwind class(es) in " +
            file +
            ": " +
            unique.join(", ") +
            ". Use the Pro-Fintech Dark hex tokens instead (apps/frontend/skills/design.md), not default Tailwind colors.",
        })
      );
    }
  } catch (e) {
    // ignore malformed input
  }
});
