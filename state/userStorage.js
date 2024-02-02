const authToken = new Map();
const getUserByToken = (token) => {
  return authToken.get(token);
};
const setUserByToken = (token, user) => {
  authToken.set(token, user);
};

const deleteToken = (token) => {
  authToken.delete(token);
};

export { getUserByToken, setUserByToken, deleteToken };
