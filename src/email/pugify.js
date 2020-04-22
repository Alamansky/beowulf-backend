const pug = require("pug");
const path = require("path");

module.exports = pugify = (locals, template) => {
  const compiledFunction = pug.compileFile(
    path.join(path.resolve() + `/src/email/templates/${template}.pug`)
  );

  locals = locals || {};
  return compiledFunction(locals);
};
