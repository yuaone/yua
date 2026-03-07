export const LANGUAGE_DEFINITIONS = [
  // ─────────────────────────────
  // 💙 Mobile / Frontend / Web
  // ─────────────────────────────
  {
    name: "dart",
    extensions: ["dart"],
    keywords: ["class", "import", "Future", "async", "await"],
  },
  {
    name: "typescript",
    extensions: ["ts", "tsx"],
    keywords: ["interface", "type", "async", "await", "export"],
  },
  {
    name: "javascript",
    extensions: ["js", "jsx"],
    keywords: ["function", "const", "let", "var", "module"],
  },
  {
    name: "swift",
    extensions: ["swift"],
    keywords: ["func", "let", "var", "class", "struct"],
  },
  {
    name: "kotlin",
    extensions: ["kt"],
    keywords: ["fun", "class", "object", "val", "var"],
  },

  // ─────────────────────────────
  // 💙 Backend / System Level
  // ─────────────────────────────
  {
    name: "python",
    extensions: ["py"],
    keywords: ["def", "class", "import", "async", "await"],
  },
  {
    name: "java",
    extensions: ["java"],
    keywords: ["class", "public", "static", "void"],
  },
  {
    name: "go",
    extensions: ["go"],
    keywords: ["package", "func", "import", "var"],
  },
  {
    name: "rust",
    extensions: ["rs"],
    keywords: ["fn", "let", "pub", "crate", "impl"],
  },
  {
    name: "php",
    extensions: ["php"],
    keywords: ["<?php", "function", "class", "echo"],
  },
  {
    name: "ruby",
    extensions: ["rb"],
    keywords: ["def", "class", "module", "end"],
  },
  {
    name: "c",
    extensions: ["c"],
    keywords: ["#include", "printf", "int", "void"],
  },
  {
    name: "cpp",
    extensions: ["cpp", "cc", "hpp"],
    keywords: ["#include", "std::", "class", "public"],
  },
  {
    name: "csharp",
    extensions: ["cs"],
    keywords: ["using", "namespace", "class", "public"],
  },
  {
    name: "scala",
    extensions: ["scala"],
    keywords: ["object", "def", "val", "var", "class"],
  },

  // ─────────────────────────────
  // 💙 Data / AI
  // ─────────────────────────────
  {
    name: "r",
    extensions: ["r"],
    keywords: ["<-", "library", "function"],
  },
  {
    name: "julia",
    extensions: ["jl"],
    keywords: ["function", "mutable struct", "end"],
  },

  // ─────────────────────────────
  // 💙 Infra / DevOps / Config
  // ─────────────────────────────
  {
    name: "yaml",
    extensions: ["yml", "yaml"],
    keywords: [":", "-", "true", "false"],
  },
  {
    name: "toml",
    extensions: ["toml"],
    keywords: ["=", "[", "]"],
  },
  {
    name: "dockerfile",
    extensions: ["dockerfile"],
    keywords: ["FROM", "RUN", "COPY", "CMD"],
  },
  {
    name: "terraform",
    extensions: ["tf"],
    keywords: ["resource", "variable", "provider", "output"],
  },

  // ─────────────────────────────
  // 💙 Markup / Documents
  // ─────────────────────────────
  {
    name: "markdown",
    extensions: ["md"],
    keywords: ["#", "-", "*", ">"],
  },
  {
    name: "xml",
    extensions: ["xml"],
    keywords: ["<", ">", "</", "<?xml"],
  },

  // ─────────────────────────────
  // 💙 DB / Query
  // ─────────────────────────────
  {
    name: "sql",
    extensions: ["sql"],
    keywords: ["SELECT", "INSERT", "UPDATE", "DELETE", "FROM"],
  },

  // ─────────────────────────────
  // 💙 Shell / CLI
  // ─────────────────────────────
  {
    name: "shell",
    extensions: ["sh", "bash"],
    keywords: ["echo", "export", "cd", "ls", "chmod"],
  },
];
