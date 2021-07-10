const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

// database created
mongoose.connect("ENTER_YOUR_DATABASE_ADDRESS_HERE", {
  // these are just to remove DeprecationWarnings
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

// Schema for list items
const itemsSchema = new mongoose.Schema({
  name: String,
});

// Model
const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your Todo list",
});

const item2 = new Item({
  name: "Hit the + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

// for a coustom list
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});

const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
  // To output the result
  Item.find({}, function (err, result) {
    // here we're checking that if the array is empty or not
    // we wanto to check if the server is running for the first time or not
    // and if its first time then only we want to add those default values
    if (result.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully Inserted Default Values");
        }
      });

      // we added these because if its first time then add those values then send data to list.ejs
      res.render("list", {
        listTitle: "Today",
        newListItem: result,
      });

      // we can also write this insted of that
      // this will start this home route again
      // res.redirect("/");
    } else {
      // if its not the first time then simply render list and pass the array(result) to list.ejs
      res.render("list", {
        listTitle: "Today",
        newListItem: result,
      });
    }
  });
});

// for a custom list, here we're getting the url of that list or name
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne(
    {
      name: customListName,
    },
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        // to check if list exist or not
        // here we're saying that if file does't exits, means its the firts time then,
        if (!result) {
          // here if list doesn't exist then create one
          const list = new List({
            name: customListName,
            items: defaultItems,
          });

          list.save();
          res.redirect("/" + customListName);
        } else {
          // here it means that list already exist and we only have to show it

          res.render("list", {
            listTitle: result.name,
            newListItem: result.items,
          });
        }
      }
    }
  );
});

app.post("/", function (req, res) {
  // here we're adding new data to the db
  // this is to pull the data
  const itemName = req.body.newItem;
  const listName = req.body.list;

  // to put the data into format to save
  const item = new Item({
    name: itemName,
  });

  if (listName === "Today") {
    // to save the data
    item.save();
    // then after saving redirect to home route
    res.redirect("/");
  } else {
    List.findOne(
      {
        name: listName,
      },
      function (err, result) {
        // here we use push because we're storing the list in the array(look above in listSchema)
        result.items.push(item);
        result.save();
        res.redirect("/" + listName);
      }
    );
  }
});

app.post("/delete", function (req, res) {
  // this is the id of the item that needs to be deleted
  const deleteItemId = req.body.deleteItem;

  // this is the list name where we want ot delete the item
  const listName = req.body.listName;

  if (listName === "Today") {
    // this is to delete the item in default list(Today)
    Item.findByIdAndRemove(deleteItemId, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully Deleted");
        res.redirect("/");
      }
    });
  } else {
    // here we want to delete a item from an array which is little tricky
    // so we have an array called items which contains all the list names and its listContaint
    // So if its not the default list(Today) then find the list where you want to delete from the 'items' array
    // and in it find the 'item' by its id, so we do that like this

    // here we have to pass three things
    // first, condition
    // secound, update(what we want to update in our case we'll find that by its id)
    // third, callback
    List.findOneAndUpdate(
      {
        name: listName,
      },
      {
        // pull is use to delete a data from an array
        // here this is three layer code, first is a code to pull data from an array(used in MongoDB)
        $pull: {
          // secound, is from where to pull(from which array(array name)) in our case its 'items' array
          items: {
            // and the last on is in array which data to pull, so we provide the '_id' of which we want to pull the data
            _id: deleteItemId,
          },
        },
      },
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/" + listName);
        }
      }
    );
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server is running");
});
