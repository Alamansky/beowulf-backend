module.exports = getExcerpt = post => {
  let sentences = 0;
  let excerpt = Array.from(post)
    .map(character => {
      if (character === ".") {
        sentences = sentences + 1;
      }
      if (sentences >= 3) {
        return null;
      }
      return character;
    })
    .join("");

  return `${excerpt}...`;
};
