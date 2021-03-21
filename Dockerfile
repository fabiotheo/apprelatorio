FROM mhart/alpine-node:12
RUN mkdir -p /home/node/app/node_modules
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "npm", "run", "build" ]
CMD [ "npm", "run", "start-asterisk" ]
