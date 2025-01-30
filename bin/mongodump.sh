# dump mongodb from docker container 
# taekes container name and file path as arguments

docker exec -i $1 mongodump --archive >  $2