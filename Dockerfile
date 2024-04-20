FROM node:lts
WORKDIR /app
EXPOSE 8088
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "prod"]
