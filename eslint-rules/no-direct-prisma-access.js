"use strict";

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\\\/g, "/");
}

function isAllowedFile(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.includes("/src/lib/db/") || normalized.endsWith("/prisma/seed.ts");
}

const MESSAGE =
  "Direct Prisma access is prohibited. Use getTenantDb() or getSystemDb().";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct Prisma and legacy db access outside standardized db layer",
    },
    schema: [],
    messages: {
      prohibited: MESSAGE,
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (isAllowedFile(filename)) {
      return {};
    }

    function report(node) {
      context.report({ node, messageId: "prohibited" });
    }

    return {
      ImportDeclaration(node) {
        if (node.source && node.source.value === "@/lib/prisma") {
          report(node);
        }
      },

      NewExpression(node) {
        if (node.callee && node.callee.type === "Identifier" && node.callee.name === "PrismaClient") {
          report(node);
        }
      },

      CallExpression(node) {
        if (node.callee && node.callee.type === "Identifier") {
          const name = node.callee.name;
          if (name === "db" || name === "dbSystem" || name === "tenantDb") {
            report(node);
          }
        }
      },

      MemberExpression(node) {
        if (node.object && node.object.type === "Identifier" && node.object.name === "prisma") {
          report(node);
        }
      },

      Identifier(node) {
        if (node.name === "prisma" || node.name === "PrismaClient") {
          report(node);
        }
      },
    };
  },
};
