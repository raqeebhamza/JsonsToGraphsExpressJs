
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post("/feedDB", (req, res) => {

    const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error(err.message);
      }
      else{
          console.log('Connected to the database.');
      }
    });
      db.run("Drop table instances");
      db.run(`CREATE TABLE IF NOT EXISTS instances (id TEXT, pos_x REAL, pos_y REAL, vel_x REAL, vel_y REAL, confidence REAL, sensors TEXT, timestamp DATE)`);

      const readStream = fs.createReadStream('FilteredData');

      readStream.on('data', chunk => {
        try {
          let data = JSON.parse(chunk);
          for (const e of data){
            const timestamp = e.timestamp.$date.$numberLong;
            const instances = e.instances;
            for (const id in instances) {
              const instance = instances[id];
              const { pos_x, pos_y, vel_x, vel_y, confidence, sensors } = instance;
              console.log(instance)
              console.log(new Date(parseInt(timestamp)))
              db.run(`INSERT INTO instances (id, pos_x, pos_y, vel_x, vel_y, confidence, sensors, timestamp) VALUES (?,?,?,?,?,?,?,?)`, [id, pos_x, pos_y, vel_x, vel_y, confidence, JSON.stringify(sensors), new Date(parseInt(timestamp))], function (err){
                if (err) {
                  return console.log(err.message);
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`);
              })
            }
          }
        } catch (error) {
          console.error(error);
        }
      });
      
      readStream.on('error', error => {
          console.error(error);
      });
      
      readStream.on('end', () => {
        console.log('File read complete');
      });

      db.close((err) => {
        if (err) {
          console.error(err.message);
        }
        console.log('Closed the database connection.');
      });

      res.send({message: "Data added to DB successfully"})

});

app.get('/api/get_pox_x/:duration', (req, res) => {
  const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else{
        console.log('Connected to the database.');
    }
  });
  const duration = req.params.duration;
  
  db.all(`select timestamp-(6*${duration}) as time , AVG(pos_x) as x
   from instances group by time order by time;`,(err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message:"Fetched Successfully",result:rows});
  })
});

app.get('/api/get_human_count/:duration', (req, res) => {
  const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else{
        console.log('Connected to the database.');
    }
  });
  const duration = req.params.duration;
  
  db.all(`select timestamp-(60*${duration}) as time , count(*) as hcount
   from instances group by time order by time;`,(err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message:"Fetched Successfully",result:rows});
  })
});
app.listen(3005, () => {
    console.log('Server started on port 3005');
});

