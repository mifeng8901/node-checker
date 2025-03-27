FROM node:lts-alpine
ENV NODE_ENV=production
RUN uname -a
EXPOSE 3000
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
RUN chown -R node /usr/src/app
USER node

CMD ["node", "index.js"]
