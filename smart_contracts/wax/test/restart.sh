
echo "Killing instance of Keosd and Nodeos"
pkill keosd && pkill nodeos

keosd &
./nodestart.sh

tail -f nodeos.log
