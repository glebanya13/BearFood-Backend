const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Seller = require('../models/seller.model');
const Item = require('../models/item.model');
const User = require('../models/user.model');
const Account = require('../models/account.model');
const Order = require('../models/order.model');
const io = require('../util/socket');
const app = require('../app');
const fs = require('fs').promises;

exports.getRestaurants = async (req, res, next) => {
    try {
        const sellers = await Seller.findAll({
            include: [{ model: Account, attributes: ['isVerified'] }],
            order: [['createdAt', 'DESC']],
        });

        const sellersFinal = sellers.filter((restaurant) => {
            return restaurant.Account.isVerified === true;
        });

        res.status(200).json({
            restaurants: sellersFinal,
            totalItems: sellersFinal.length,
        });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.postCart = async (req, res, next) => {
    const itemId = req.body.itemId;
    let targetItem;
    try {
        if (!itemId) {
            const error = new Error('ItemId not provided');
            error.statusCode = 404;
            throw error;
        }

        const item = await Item.findByPk(itemId);
        if (!item) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }

        targetItem = item;
        const account = await Account.findByPk(req.loggedInUserId);
        const user = await User.findOne({ where: { account_id: account.id } });

        const updatedUser = await user.addToCart(targetItem);

        res.status(200).json({ message: 'Item successfully added to cart.', user: updatedUser });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getCart = async (req, res, next) => {
    try {
        const account = await Account.findByPk(req.loggedInUserId);
        const user = await User.findOne({ where: { account_id: account.id } });
        const userWithItems = await user.populate('cart.items.itemId');

        const cartItems = userWithItems.cart.items;
        let totalPrice = 0;

        cartItems.forEach((item) => {
            totalPrice = totalPrice + item.quantity * item.itemId.price;
        });

        res.json({ cart: cartItems, totalPrice: totalPrice });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.postCartDelete = async (req, res, next) => {
    const itemId = req.body.itemId;
    try {
        if (!itemId) {
            const error = new Error('ItemId not provided');
            error.statusCode = 404;
            throw error;
        }

        const account = await Account.findByPk(req.loggedInUserId);
        const user = await User.findOne({ where: { account_id: account.id } });
        const updatedUser = await user.removeFromCart(itemId);

        res.status(200).json({ message: 'Item successfully removed from cart.', user: updatedUser });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.postCartRemove = async (req, res, next) => {
    const itemId = req.params.itemId;
    try {
        if (!itemId) {
            const error = new Error('ItemId not provided');
            error.statusCode = 404;
            throw error;
        }

        const account = await Account.findByPk(req.loggedInUserId);
        const user = await User.findOne({ where: { account_id: account.id } });
        const updatedUser = await user.reduceQuantity(itemId);

        res.status(200).json({ message: 'Item successfully updated.', user: updatedUser });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getRestaurant = async (req, res, next) => {
    const restId = req.params.restId;
    try {
        const restaurant = await Seller.findByPk(restId, { include: 'items' });

        if (!restaurant) {
            const error = new Error('Restaurant not found');
            error.statusCode = 404;
            throw error;
        }

        res.json({ result: restaurant });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.postAddress = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation Failed, Incorrect data entered.');
        error.statusCode = 422;
        error.errors = errors.array();
        throw error;
    }

    const phoneNo = req.body.phoneNo;
    const street = req.body.street;
    const locality = req.body.locality;
    const aptName = req.body.aptName;
    const zip = req.body.zip;
    const lat = req.body.lat;
    const lng = req.body.lng;
    const formattedAddress = req.body.formattedAddress;

    try {
        const account = await Account.findByPk(req.loggedInUserId);
        const user = await User.findOne({ where: { account_id: account.id } });

        const updatedUser = await User.update(
            {
                address: {
                    street: street,
                    locality: locality,
                    zip: zip,
                    phoneNo: phoneNo,
                    aptName: aptName,
                    lat: lat,
                    lng: lng,
                },
                formattedAddress: formattedAddress,
            },
            { where: { id: user.id }, returning: true }
        );

        res.json({ user: updatedUser[1][0] });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getItems = async (req, res, next) => {
    try {
        const account = await Account.findByPk(req.loggedInUserId);
        const seller = await Seller.findOne({ where: { account_id: account.id } });
        const items = await Item.findAll({ where: { creator_id: seller.id } });

        res.json({ items: items });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getItem = async (req, res, next) => {
    const itemId = req.params.itemId;
    try {
        const item = await Item.findByPk(itemId);

        if (!item) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ message: 'Item fetched successfully', item: item });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.createItem = async (req, res, next) => {
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

    try {
        const account = await Account.findByPk(req.loggedInUserId);
        const seller = await Seller.findOne({ where: { account_id: account.id } });

        const item = await Item.create({
            title: title,
            imageUrl: imageUrl,
            description: description,
            price: price,
            tags: tags,
            creator_id: seller.id,
        });

        await seller.addItem(item);

        res.status(201).json({
            message: 'Item created, hurray!',
            item: item,
            creator: { _id: seller.id, name: seller.name },
        });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.deleteItem = async (req, res, next) => {
    const itemId = req.params.itemId;
    try {
        const item = await Item.findByPk(itemId);

        if (!item) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }

        await fs.unlink(item.imageUrl);

        await item.destroy();

        const account = await Account.findByPk(req.loggedInUserId);
        const seller = await Seller.findOne({ where: { account_id: account.id } });

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

    try {
        const fetchedItem = await Item.findByPk(itemId);

        if (!fetchedItem) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }

        if (imageUrl !== fetchedItem.imageUrl) {
            await fs.unlink(fetchedItem.imageUrl);
        }

        fetchedItem.title = title;
        fetchedItem.description = description;
        fetchedItem.price = price;
        fetchedItem.tags = tags;
        fetchedItem.imageUrl = imageUrl;

        const updatedItem = await fetchedItem.save();

        res.status(200).json({
            message: 'Item updated',
            item: updatedItem,
        });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getLoggedInUser = async (req, res, next) => {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            throw error;
        }

        const token = authHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, "supersecretkey-foodWebApp");
        if (!decodedToken) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            throw error;
        }

        const accountId = decodedToken.accountId;

        const account = await Account.findById(accountId);
        if (!account) {
            const error = new Error("Internal server error");
            error.statusCode = 500;
            throw error;
        }

        let result;

        const user = await User.findOne({ account: account._id }).populate({
            path: "account",
            select: ["email", "role"],
        });

        if (user) {
            result = user;
        } else {
            const seller = await Seller.findOne({ account: account._id })
                .populate("items")
                .populate({ path: "account", select: ["email", "role"] });

            result = seller;
        }

        res.json({ result });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.postOrder = async (req, res, next) => {
    try {
        const account = await Account.findById(req.loggedInUserId);
        const user = await User.findOne({ account: account._id });
        const result = await user.populate("cart.items.itemId").execPopulate();

        const sellers = result.cart.items.reduce((acc, item) => {
            if (!acc[item.itemId.creator]) {
                acc[item.itemId.creator] = [];
            }

            acc[item.itemId.creator].push(item);
            return acc;
        }, {});

        for (const [seller, cartItem] of Object.entries(sellers)) {
            const sellerDoc = await Seller.findById(seller);

            const items = cartItem.map((i) => ({
                quantity: i.quantity,
                item: { ...i.itemId._doc },
            }));

            const order = new Order({
                user: {
                    email: account.email,
                    name: result.firstName,
                    address: result.address,
                    userId: result,
                },
                items: items,
                status: "Placed",
                seller: {
                    name: sellerDoc.name,
                    phone: sellerDoc.address.phoneNo,
                    sellerId: sellerDoc,
                },
            });

            await order.save();

            for (const clientId of Object.keys(app.clients)) {
                if (clientId.toString() === sellerDoc._id.toString()) {
                    io.getIO().sockets.connected[app.clients[clientId].socket].emit("orders", {
                        action: "create",
                        order: order,
                    });
                }
            }
        }

        await user.clearCart();

        res.status(200).json({ result });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            throw error;
        }

        const token = authHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, "supersecretkey-foodWebApp");
        if (!decodedToken) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            throw error;
        }

        const accountId = decodedToken.accountId;

        const account = await Account.findById(accountId);

        let result;

        if (account.role === "ROLE_USER") {
            result = await User.findOne({ account: account._id });
        } else if (account.role === "ROLE_SELLER") {
            result = await Seller.findOne({ account: account._id });
        }

        const orders = result instanceof User
            ? await Order.find({ "user.userId": result._id }).sort({ createdAt: -1 })
            : await Order.find({ "seller.sellerId": result._id }).sort({ createdAt: -1 });

        res.status(200).json({ orders });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.postOrderStatus = async (req, res, next) => {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            throw error;
        }

        const token = authHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, "supersecretkey-foodWebApp");
        if (!decodedToken) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            throw error;
        }

        const accountId = decodedToken.accountId;

        const orderId = req.params.orderId;
        if (!req.body.status) {
            const error = new Error("Status Not Provided");
            error.statusCode = 404;
            throw error;
        }
        const status = req.body.status;
        const order = await Order.findById(orderId);

        if (!order) {
            const error = new Error("Could not find any Order with the given orderId");
            error.statusCode = 404;
            throw error;
        }

        order.status = status;
        const updatedOrder = await order.save();

        io.getIO().emit("orders", { action: "update", order: updatedOrder });

        res.status(200).json({ updatedOrder });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getConnectedClients = (req, res, next) => {
    res.json({ clients: app.clients });
};

exports.getRestaurantsByAddress = async (req, res, next) => {
    const lat1 = req.params.lat;
    const lon1 = req.params.lng;

    try {
        const sellers = await Seller.findAll({
            include: [
                {
                    model: Account,
                    attributes: ['isVerified'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        const sellersVerified = sellers.filter((restaurant) => restaurant.Account.isVerified === true);

        const sellersFinal = sellersVerified.reduce((result, seller) => {
            const lat2 = seller.address.lat;
            const lon2 = seller.address.lng;

            const R = 6371;
            const φ1 = (lat1 * Math.PI) / 180;
            const φ2 = (lat2 * Math.PI) / 180;
            const Δφ = ((lat2 - lat1) * Math.PI) / 180;
            const Δλ = ((lon2 - lon1) * Math.PI) / 180;

            const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const d = R * c;
            if (d < 10) result.push(seller);

            return result;
        }, []);

        res.status(200).json({
            restaurants: sellersFinal,
            totalItems: sellersFinal.length,
        });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};