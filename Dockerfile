FROM ants/nodejs:v1
MAINTAINER Serge Bredin <serge@preuvesetconcepts.com>

RUN npm install gulp -g

RUN apt-get update && apt-get install -y \
    python \
    python-pip \
    sudo \
    python-dev libjpeg-dev libfreetype6-dev zlib1g-dev
   
RUN apt-get -y install sudo

RUN mkdir /pixifier
WORKDIR /pixifier

# install python dependencies
ADD app/utils_python/requirements.txt /pixifier/requirements.txt
RUN sudo pip install -r /pixifier/requirements.txt

# install node modules
ADD app/package.json /pixifier/package.json
RUN npm install
