module.exports = {
  extends: ["airbnb-base", "plugin:prettier/recommended", "airbnb"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        doubleQuote: true,
        endOfLine: "auto",
      },
    ],
    "linebreak-style": 0,
    quotes: "off",
  },
};
