const getRandomTest = (len) => {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < +len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

const generateSocketId = () => {
    const min = 0;
    const max = 10000000000;
    const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    return Date.now() + '.' + randomNumber(min, max);
}

export { getRandomTest, generateSocketId }
