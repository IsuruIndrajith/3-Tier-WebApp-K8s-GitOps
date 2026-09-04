FROM node:16-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
# COPY /app/img /usr/share/nginx/html/img

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]