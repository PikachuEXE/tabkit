#!/bin/sh
rm -rf build
mkdir -p build/chrome
cd xpi/chrome
zip -0 ../../build/chrome/tabkit.jar *
cd ../..
cp xpi/COPYING build
cp xpi/install.rdf build
cp xpi/chrome.manifest build
mkdir -p build/defaults/preferences
cp xpi/defaults/preferences/* build/defaults/preferences

cd build
zip -r ../tabkit.xpi *
cd ..
mv tabkit.xpi tabkit-`date +"%Y-%m-%d"`.xpi
