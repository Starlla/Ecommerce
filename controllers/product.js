const formidable = require('formidable');
const _ = require('lodash');
const fs = require('fs');
const Product = require('../models/product')
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.productById = (req, res, next, id) => {
  Product.findById(id).populate('category').exec((err, product) => {
    if (err || !product) {
      return res.status(400).json({
        error: 'IProduct not found'
      })
    }
    req.product = product
    next();
  });
}

exports.read = (req, res) => {
  req.product.photo = undefined;
  return res.json(req.product);
}

exports.create = (req, res) => {
  console.log(req.body)
  let form = new formidable.IncomingForm()
  form.keepExtensions = true
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      return res.status(400).json({
        error: 'Image cuold not be uploaded'
      })
    }

    const { name, description, price, category, quantity, shipping } = fields;

    if (!name || !description || !price || !category || !quantity || !shipping) {
      return res.status(400).json({
        error: "all fields are required"
      })
    }



    let product = new Product(fields)

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image should be less than 1mb in size'
        })
      }
      product.photo.data = fs.readFileSync(files.photo.path)
      product.photo.contentType = files.photo.type
    }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err)
        })
      }
      res.json(result);
    })
  })

}

exports.remove = (req, res) => {
  let product = req.product
  product.remove((err, deletedProduct) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err)
      })
    }
    res.json({
      deletedProduct,
      'message': 'Product deleted successfully'
    })
  })
}

exports.update = (req, res) => {
  let form = new formidable.IncomingForm()
  form.keepExtensions = true
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      return res.status(400).json({
        error: 'Image cuold not be uploaded'
      })
    }

    const { name, description, price, category, quantity, shipping } = fields;

    if (!name || !description || !price || !category || !quantity || !shipping) {
      return res.status(400).json({
        error: "all fields are required"
      })
    }

    let product = req.product;
    product = _.extend(product, fields);

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image should be less than 1mb in size'
        })
      }
      product.photo.data = fs.readFileSync(files.photo.path)
      product.photo.contentType = files.photo.type
    }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err)
        })
      }
      res.json(result);
    })
  })
}

/*
* Sell and arrival
* by sell = /products?sortBy=sold&order=desc&limit=4
* by arrival = /products?sortBy=createdAt&order=desc&limit=4
* if no params are sent, then all products are returned
*/


exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : 'asc'
  let sortBy = req.query.sortBy ? req.query.sortBy : '_id'
  let limit = req.query.limit ? parseInt(req.query.limit) : 6

  Product.find().select("-photo").populate('category').sort([[sortBy, order]]).limit(limit).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        err: 'Products not found'
      })
    }
    res.json(data)
  })
}

/*
* it will find the products based on the req product category
* other products taht has the same category, will be returned
*/
exports.listRelated = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 6

  Product.find({ _id: { $ne: req.product }, category: req.product.category }).limit(limit)
    .populate('category', '_id name')
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          err: 'Products not found'
        })
      }
      res.json(products);
    })
}

exports.listCategories = (req, res) => {
  Product.distinct("category", {}, (err, categories) => {
    if (err) {
      return res.status(400).json({
        err: 'Categories not found'
      })
    }
    res.json(categories)
  })
}

/**
 * list products by search
 */

exports.listBySearch = (req, res) => {
  let order = req.body.order ? req.body.order : "desc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  // console.log(order, sortBy, limit, skip, req.body.filters);
  // console.log("findArgs", findArgs);

  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        // gte -  greater than price [0-10]
        // lte - less than
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1]
        };
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  Product.find(findArgs)
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found"
        });
      }
      res.json({
        size: data.length,
        data
      });
    });
};

exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    res.set('Content-Type', req.product.photo.contentType)
    return res.send(req.product.photo.data)
  }
  next();
}

exports.listSearch = (req, res) => {
  const query = {}
  if (req.query.search) {
    query.name = new RegExp(req.query.search, 'i')
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category
    }
  }

  Product.find(query, (err, products) => {
    if (err) {
      console.log(err)
      return res.status(400).json({
        error: errorHandler(err)
      })
    }
    res.json(products)
  }).select('-photo')

}




