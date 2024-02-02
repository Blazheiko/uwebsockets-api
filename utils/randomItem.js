import crypto from 'node:crypto';

const getRandomTest = (len) => {
  let text = '';
  let possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < +len; i++)
    text += possible.charAt(crypto.randomInt(0, possible.length));

  return text;
};

const generateSocketId = () => {
  const max = 10000000000;

  return Date.now() + '.' + crypto.randomInt(0, max);
};

export { getRandomTest, generateSocketId };
