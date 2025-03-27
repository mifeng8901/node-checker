FROM node:lts-alpine
ENV NODE_ENV=production
RUN uname -a
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .

RUN chown -R node /usr/src/app
USER node
RUN node index
