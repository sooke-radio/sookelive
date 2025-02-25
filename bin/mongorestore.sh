# restore mongo db to docker container 
# takes container name and file path as arguments
docker exec -i $1 mongorestore --archive < $2

# restore from one db to another:
# docker exec -i mongo-sl2db-1 mongorestore --nsFrom=sl-p3.* --nsTo=sl2db.* --archive < sl-p3.dump