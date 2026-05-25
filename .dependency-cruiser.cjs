module.exports = {
  forbidden: [
    {
      name: "adapters-use-core-interfaces-only",
      severity: "error",
      from: { path: "^src/adapters" },
      to: { path: "^src/core/(?!.*\\.interface\\.ts$)" },
    },
    {
      name: "apps-use-public-runtime-only",
      severity: "error",
      from: { path: "^src/apps" },
      to: { path: "^src/(core|adapters)/" },
    },
    {
      name: "core-does-not-use-apps-or-adapters",
      severity: "error",
      from: { path: "^src/core" },
      to: { path: "^src/(apps|adapters)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    reporterOptions: {
      dot: {
        theme: {
          graph: {
            concentrate: "true",
            rankdir: "LR",
            ranksep: "0.28",
            nodesep: "0.18",
            splines: "ortho",
          },
          edge: {
            arrowhead: "normal",
            arrowsize: "0.6",
            color: "#00000033",
            penwidth: "2.0",
          },
        },
      },
    },
    tsPreCompilationDeps: true,
  },
};
