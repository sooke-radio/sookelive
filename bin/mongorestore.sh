# restore mongo db to docker container 
# takes container name and file path as arguments
docker exec -i $1 mongorestore --archive < $2