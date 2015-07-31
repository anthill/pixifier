# pixifier
## A picture classifier using CNN (convolutional neural networks)

This repository's goal is to create a way to classify pictures in categories.

It's composed of three docker containers :

1. rebuild-pics.yml : Get pictures used for training in a distant database, download them and resize them.

2. classify-pics.yml : Train a CNN with theses pictures.

3. report.yml : Start a web server in order to easily see the results on a webpage.


## Requirements :
* docker
* docker-compose
* git


## How to install :
#### 1. Clone this repository : 

"git clone https://github.com/anthill/pixifier.git"

#### 2. Mount the 3 docker containers : 

"docker-compose -f rebuild-pics.yml build"

"docker-compose -f classify-pics.yml build"

"docker-compose -f report.yml build"


## How to configure :

#### Create the file app/param-ini.json and configure it (example in param-ini.json.sample)

* urlAPI : URL of the training API sending you every pictures, and their associated categories

    here's what the API should look like :

    [{"category":"CATEGORY","title":"KEYWORD1 KEYWORD2 ","pics":"pic1.jpg;pic2.jpg;"},{"category":"sport","title":"red bicycle","pics":"bicycle(1).jpg;"}]

* urlPics : URL where pics are located

* maxPics : How many pics should it download for each object

* classes : An array which determines what objects you want to download pics for :

	* active : boolean : allows to disable some objects (useful when testing)

	* name : String : name of the object (ex : bicycle)

	* categories : Array : categories it will search for this item in the API (ex: sport)

	* keywords : Array : keywords related to this item in the API (ex: "bicycle", "mountain bike", "bike")


## How to use :
#### Start the three containers :

"docker-compose -f rebuild-pics.yml up"

"docker-compose -f classify-pics.yml up"

"docker-compose -f report.yml up"

## Other informations :

Special thanks to kaparthy, who created the library [ConvNetJS](http://cs.stanford.edu/people/karpathy/convnetjs/), that we use.
