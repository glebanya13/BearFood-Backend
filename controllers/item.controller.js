const path = require('path');
const fs = require('fs').promises;
const { validationResult } = require('express-validator');
const Item = require('../models/item.model');
const Seller = require('../models/seller.model');
const Account = require('../models/account.model');

exports.createItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation Failed, Incorrect data entered.');
      error.statusCode = 422;
      error.errors = errors.array();
      throw error;
    }

    if (!req.file) {
      const error = new Error('Upload an image as well.');
      error.statusCode = 422;
      throw error;
    }

    const imageUrl = req.file.path;
    const title = req.body.title;
    const price = req.body.price;
    const tags = req.body.tags;
    const description = req.body.description;

    const account = await Account.findByPk(req.loggedInUserId);
    const seller = await Seller.findOne({ where: { accountId: account.id } });

    const item = await Item.create({
      title,
      imageUrl,
      description,
      price,
      tags,
      SellerId: seller.id,
    });

    res.status(201).json({
      message: 'Item created, hurray!',
      item,
      creator: { _id: seller.id, name: seller.name },
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    const item = await Item.findByPk(itemId);

    if (!item) {
      const error = new Error('Could not find any Item with the given itemId');
      error.statusCode = 404;
      throw error;
    }

    await fs.unlink(path.join(__dirname, '..', item.imageUrl));

    await Item.destroy({ where: { id: itemId } });

    const account = await Account.findByPk(req.loggedInUserId);
    const seller = await Seller.findOne({ where: { accountId: account.id } });

    await seller.removeItem(itemId);

    res.status(200).json({
      message: 'Item deleted successfully.',
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.editItem = async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation Failed, Incorrect data entered.');
      error.statusCode = 422;
      error.errors = errors.array();
      throw error;
    }

    let imageUrl = req.body.image;
    const title = req.body.title;
    const price = req.body.price;
    const tags = req.body.tags;
    const description = req.body.description;

    if (req.file) imageUrl = req.file.path;
    if (!imageUrl) {
      const error = new Error('Image was not found, try again.');
      error.statusCode = 404;
      throw error;
    }

    const item = await Item.findByPk(itemId);

    if (!item) {
      const error = new Error('Could not find any Item with the given itemId');
      error.statusCode = 404;
      throw error;
    }

    if (imageUrl !== item.imageUrl) {
      await fs.unlink(path.join(__dirname, '..', item.imageUrl));
    }

    item.title = title;
    item.description = description;
    item.price = price;
    item.tags = tags;
    item.imageUrl = imageUrl;

    await item.save();

    res.status(200).json({
      message: 'Item updated',
      item,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.loggedInUserId);
    const seller = await Seller.findOne({ where: { accountId: account.id } });
    const items = await Item.findAll({ where: { SellerId: seller.id } });

    res.json({ items });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getItem = async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    const item = await Item.findByPk(itemId);

    if (!item) {
      const error = new Error('Could not find any Item with the given itemId');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      message: 'Item fetched successfully',
      item,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};