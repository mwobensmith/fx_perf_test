# fx_perf_test


Quick and dirty shell script for comparing connection speed of a given URL, using two Firefox builds.

Sample usage:


Test local Nightly against Release

./perf_runner.sh -u=https://google.com -s=20 -a=/Applications/FirefoxNightly.app/Contents/MacOS/firefox -b=/Applications/Firefox.app/Contents/MacOS/firefox

Check accuracy of this script by running same build against itself

./perf_runner.sh -u=https://google.com -s=20 -a=/Applications/Firefox.app/Contents/MacOS/firefox -b=/Applications/Firefox.app/Contents/MacOS/firefox

