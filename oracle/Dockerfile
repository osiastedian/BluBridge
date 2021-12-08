FROM node:lts-fermium

WORKDIR /app

COPY package.json /app/

COPY yarn.lock /app/

RUN yarn

COPY eos-oracle.js /app/

COPY polygon-oracle.js /app/

COPY bsc-oracle.js /app/

COPY ./abi /abi