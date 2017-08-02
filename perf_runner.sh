#!/bin/bash


for i in "$@"
do
case $i in
    -u=*)
    uri="${i#*=}"
    ;;
    -a=*)
    test_build="${i#*=}"
    ;;
    -b=*)
    base_build="${i#*=}"
    ;;
    -p1=*)
    pref1="${i#*=}"
    ;;
    -p2=*)
    pref2="${i#*=}"
    ;;
    -s=*)
    scans="${i#*=}"
    ;;
    -h)
    help=1
    ;;
    *)
    ;;
esac
done

if [ -n "${help}" ]
then
    echo $'\n'Usage: 
    echo $'\t'-a local path to test Firefox binary
    echo $'\t'-b local path to base Firefox binary
    echo $'\t'-u full URI, including scheme
    echo $'\n'Optional:
    echo $'\t'-s number of times to scan '(default: 10)'
    echo $'\t'-p1 'preference;value for test build'
    echo $'\t'-p2 'preference;value for base build'
    echo
    exit
fi

if [ -z $scans ]
then
    scans=10
fi  

echo ""
echo "Beginning "$scans" scans of "$uri"..."
script_path="perf_scan.js"
uri_arg=' -u='$uri
pref_arg_test=' -p='$pref1
pref_arg_base=' -p='$pref2
declare -i speed_total_test=0
declare -i speed_total_base=0
speed_samples_test=()
speed_samples_base=()

for (( c=1; c<=$scans; c++ ))
do
    cmd=$test_build" --xpcshell "$script_path$uri_arg$pref_arg_test
    var="$(echo $($cmd))"
    speed_total_test+=$var
    speed_samples_test+=("$var")

    cmd=$base_build" --xpcshell "$script_path$uri_arg$pref_arg_test
    var="$(echo $($cmd))"
    speed_total_base+=$var
    speed_samples_base+=("$var")
done


# calculate avg and median
# sort samples first
IFS=$'\n' 
sorted_speeds_test=($(sort -n <<<"${speed_samples_test[*]}"))
sorted_speeds_base=($(sort -n <<<"${speed_samples_base[*]}"))
unset IFS

((mid = scans/2))
if ((scans % 2 == 0)); then
  ((median_test = (sorted_speeds_test[mid] + sorted_speeds_test[mid-1]) / 2))
  ((median_base = (sorted_speeds_base[mid] + sorted_speeds_base[mid-1]) / 2))
else
  ((median_test = sorted_speeds_test[mid]))
  ((median_base = sorted_speeds_base[mid]))
fi

((speed_average_test = (speed_total_test/scans)))
((speed_average_base = (speed_total_base/scans)))

((a=100*speed_average_test))
((b=100*speed_average_base))
((average_change = ((a-b)/speed_average_base)))

((a=100*median_test))
((b=100*median_base))
((median_change = ((a-b)/median_base)))

echo $'\n'"Results for "$uri
echo $'\n'"Test build:"
echo $'\t'"Path: " $test_build
echo $'\t''Speed samples, unsorted: '"${speed_samples_test[@]}" 
echo $'\t''Speed samples, sorted: '"${sorted_speeds_test[@]}" 
echo $'\t'"Average: " $speed_average_test
echo $'\t'"Median: " $median_test

echo $'\n'"Base build:"
echo $'\t'"Path: " $base_build
echo $'\t''Speed samples, unsorted: '"${speed_samples_base[@]}" 
echo $'\t''Speed samples, sorted: '"${sorted_speeds_base[@]}" 
echo $'\t'"Average: " $speed_average_base
echo $'\t'"Median: " $median_base

echo $'\n'"Speed change, average: " $average_change
echo "Speed change, median: " $median_change $'\n'

# Sample usage:

# Test local Nightly against Release
# ./perf_runner.sh -u=https://google.com -s=8 -a=/Applications/FirefoxNightly.app/Contents/MacOS/firefox -b=/Applications/Firefox.app/Contents/MacOS/firefox

# Check accuracy of this script by running same build against itself
# ./perf_runner.sh -u=https://google.com -s=8 -a=/Applications/Firefox.app/Contents/MacOS/firefox -b=/Applications/Firefox.app/Contents/MacOS/firefox

