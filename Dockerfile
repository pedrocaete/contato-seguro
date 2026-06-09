FROM node:24-alpine

WORKDIR /var/www

RUN apk add --no-cache bash openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN chown -R 1000:984 /var/www

EXPOSE 3333

CMD ["npm", "run", "dev"]
