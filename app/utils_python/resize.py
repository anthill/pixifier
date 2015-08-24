#!/usr/bin/python

import sys
import os
import json
from PIL import Image

def main():
   
	data_folder = '/pixifier/app/data'
	json_parameters = open(data_folder+'/../param-ini.json')
    
	for line in json.load(json_parameters)['classes']:
		if line["active"] == True:
			print '> Resize', line['name']
			for dirPath, dirName, fileNames in os.walk(data_folder+'/'+line['name']):
				for fileName in fileNames:
					try:
						img = Image.open(os.path.join(dirPath,fileName));
						outImg = img.resize((64, 64));
						outImg.save(os.path.join(dirPath, fileName))
					except Exception as inst:
						print "X Erreur ", fileName
						print inst
						continue
main()
