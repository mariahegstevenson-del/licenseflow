# LicenseFlow — static site on nginx (no build step needed).
FROM nginx:1.27-alpine
ENV PORT=8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY *.html *.css *.js /usr/share/nginx/html/
EXPOSE 8080
