module.exports = function err(errorMessage, details) {
  let possibleErrors = {
    email: `No users found for the following email address: ${details}`,
    password: `Your password is incorrect.`,
    noMatchPasswords: `Passwords do not match. Please try again.`,
    noToken: `Your password reset token is invalid or expired.`,
    noUser: `You must be logged in as an admin to perform that action.`,
    noPermission: `You do not have permission to perform this action.`,
    noCartItem: `No cart item was found for that ID.`
  };
  return possibleErrors[errorMessage];
};
