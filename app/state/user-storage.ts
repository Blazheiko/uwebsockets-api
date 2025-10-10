const authToken = new Map();
const getUserByToken = (token: string) => {
    return authToken.get(token);
};
const setUserByToken = (token: string, user: any) => {
    authToken.set(token, user);
};

const deleteToken = (token: string) => {
    authToken.delete(token);
};

export { getUserByToken, setUserByToken, deleteToken };
