FROM node:20-alpine as build
WORKDIR /app
COPY . /app
RUN npm install

RUN npm test -- --watchAll=false --passWithNoTests

RUN npm run build

FROM docker.io/library/nginx:alpine
# Copiamos los archivos compilados desde la etapa anterior
COPY --from=build /app/build /usr/share/nginx/html
# Exponemos el puerto 80 (estándar de Nginx)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

