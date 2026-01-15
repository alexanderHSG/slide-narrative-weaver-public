export const getStoryPointLabel = (sp, idx) => {
    const title = (sp.shortTitle || "No title created for the Storypoint");
    const desc = ((sp.description || "").replace(/\n/g, " ").length <= 60)
      ? (sp.description || "").replace(/\n/g, " ")
      : (sp.description || "").replace(/\n/g, " ").slice(0, 60).replace(/\s+\S*$/, "") + "...";

    const fixedLines = [
      `<b>${idx + 1}: ${title}</b>`,
      "",
      desc,
      "",
    ];
    return fixedLines.join("\n");
  };