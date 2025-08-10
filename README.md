"meseroCocina" password: "1234" role: mesero-cocina
"meseroBar" password: "5678" role: mesero-bar
"cocinero" password: "abcd" role: cocinero
"bartender" password: "fghi" role: bartender
"adminComida" password: "1234+" role: admin-comida
"adminBebidas" password: "5678+" role: admin-bebidas

cd server 
node server.js

cd server
node serverBar.js

cd server
json-server --watch db.json --port 3001

cd client 
npm start