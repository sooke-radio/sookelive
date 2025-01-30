# restore mongo db to docker container 
# taekes container name and file path as arguments
docker exec -i $1 mongorestore --archive < $2