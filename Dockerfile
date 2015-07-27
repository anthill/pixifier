FROM ants/nodejs:v1
MAINTAINER Serge Bredin <serge@preuvesetconcepts.com>

RUN npm install gulp -g

RUN mkdir /pixifier
WORKDIR /pixifier

# install node modules
ADD app/package.json /pixifier/package.json
RUN npm install
