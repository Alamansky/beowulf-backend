const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { makeANiceEmail, transport } = require("../vendor/nodemailer");
const { hasPermission } = require("../util/utils");
const stripe = require("../vendor/stripe");
const err = require("../util/err");
const sendJWT = require("../util/sendJWT");
const getExcerpt = require("../util/getExcerpt");
const sendEmail = require("../email/sendEmail");
const pugify = require("../email/pugify");
const formatMoney = require("../util/formatMoney");
const customer__order__placed = require("../email/copy/customer__order__placed");
const customer__order__shipped = require("../email/copy/customer__order__shipped");
const admin__order__placed = require("../email/copy/admin__order__placed.js");
const admin__password__reset = require("../email/copy/admin__password__reset.js");

const Mutations = {
  async createItem(parent, args, ctx, info) {
    const { userId } = ctx.request;
    if (!userId) throw new Error(err("noUser"));
    const item = await ctx.db.mutation.createItem(
      { data: { user: { connect: { id: userId } }, ...args } },
      info
    );
    return item;
  },

  updateItem(parent, args, ctx, info) {
    const updates = { ...args };
    delete updates.id;
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id,
        },
      },
      info
    );
  },

  async deleteItem(parent, args, ctx, info) {
    const { userId } = ctx.request;
    const { permissions } = ctx.request.user;
    if (!userId) throw new Error(err("noUser"));
    const where = { id: args.id };
    const item = await ctx.db.query.item({ where }, `{id title user {id}}`);
    const ownsItem = item.user.id === userId;
    const hasPermissions = permissions.some((permission) =>
      ["ADMIN", "ITEMDELETE"].includes(permission)
    );

    if (!ownsItem && !hasPermissions) throw new Error(err("noPermission"));
    return ctx.db.mutation.deleteItem({ where }, info);
  },

  async signup(parent, args, ctx, info) {
    args.email = args.email.toLowerCase();
    const hashedPassword = await bcrypt.hash(args.password, 10);
    delete args.password;
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          password: hashedPassword,
          permissions: { set: ["USER", "ADMIN"] },
          ...args,
        },
      },
      info
    );

    sendJWT(ctx, user);

    return user;
  },

  async signin(parent, { email, password }, ctx, info) {
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) throw new Error(err("email", email));
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) throw new Error(err("password"));

    sendJWT(ctx, user);

    return user;
  },

  async signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    return { message: "Goodbye!" };
  },

  async requestReset(parent, args, ctx, info) {
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) throw new Error(err("email", args.email));
    const randomBytesPromiseified = promisify(randomBytes);
    const resetToken = (await randomBytesPromiseified(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;
    const res = await ctx.db.mutation.updateUser({
      where: {
        email: args.email,
      },
      data: { resetToken, resetTokenExpiry },
    });

    let url =
      process.env.NODE_ENV == "dev"
        ? process.env.LOCALHOST
        : process.env.FRONTEND_NOW_URL;

    /* const mailResponse = await transport.sendMail({
      from: "admin@beowulfbeardco.com",
      to: args.email,
      subject: "Password Reset for Beowulf Beard Co",
      html: makeANiceEmail(
        `Your Password Reset Token is here!\n\n<a href="${url}/reset?resetToken=${resetToken}">Click Here to Reset</a>`
      ),
    }); */

    const locals = {
      admin: true,
      message: admin__password__reset(),
      userData: {
        "Reset Link": `${url}/reset?resetToken=${resetToken}`,
      },
    };

    sendEmail({
      recipient: args.email,
      subject: "Password Reset Token for Beowulf Beard Co",
      template: pugify(locals, "admin__password__reset"),
    });

    return { message: "Thanks!" };
  },

  async resetPassword(parent, args, ctx, info) {
    const { resetToken, password, confirmPassword } = args;
    console.log(password);
    console.log(confirmPassword);
    if (password !== confirmPassword) throw new Error(err("noMatchPasswords"));
    const [user] = await ctx.db.query.users({
      where: { resetToken },
      resetTokenExpiry_gte: Date.now() - 3600000,
    });
    if (!user) throw new Error(err("noToken"));
    const newPassword = await bcrypt.hash(password, 10);
    const updatedUser = await ctx.db.mutation.updateUser({
      where: {
        email: user.email,
      },
      data: { password: newPassword, resetToken: null, resetTokenExpiry: null },
    });

    sendJWT(ctx, user);

    return updatedUser;
  },

  async updatePermissions(parent, args, ctx, info) {
    const { id, permissions } = args;
    const { userId, user } = ctx.request;
    if (!userId) throw new Error(err(noUser));
    hasPermission(user, ["ADMIN", "PERMISSIONUPDATE"]);
    return ctx.db.mutation.updateUser({
      where: {
        id,
      },
      data: { permissions: { set: permissions } },
    });
  },

  async addToCart(parent, args, ctx, info) {
    const { userId } = ctx.request;
    // create user variable
    let user = {};
    if (!userId) {
      user = await ctx.db.mutation.createUser(
        {
          data: {
            permissions: { set: args.permissions },
          },
        },
        info
      );
      sendJWT(ctx, user);
    }

    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: ctx.request.userId || user.id },
        item: { id: args.id },
      },
    });
    if (existingCartItem) {
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 },
        },
        info
      );
    }
    return ctx.db.mutation.createCartItem(
      {
        data: {
          user: { connect: { id: ctx.request.userId || user.id } },
          item: { connect: { id: args.id } },
          quantity: args.quantity,
        },
      },
      info
    );
  },

  async removeFromCart(parent, args, ctx, info) {
    const cartItem = await ctx.db.query.cartItem(
      { where: { id: args.id } },
      `{id, user {id}}`
    );

    if (!cartItem) throw new Error(err(noCartItem));

    if (cartItem.user.id !== ctx.request.userId)
      throw new Error("There was an error");

    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id },
      },
      info
    );
  },

  async createOrder(parent, args, ctx, info) {
    // query current user and make sure they are signed in
    const { userId } = ctx.request;
    if (!userId) throw new Error(err(noUser));

    // recalc total for the price
    const user = await ctx.db.query.user(
      { where: { id: userId } },
      `{id name email cart {id quantity item {title price id description image largeImage}}}`
    );
    const amount = user.cart.reduce(
      (totalPrice, cartItem) =>
        totalPrice + cartItem.item.price * cartItem.quantity,
      0
    );

    console.log(amount);

    // create the stripe charge
    const charge = await stripe.charges.create({
      amount,
      currency: "USD",
      source: args.token,
    });

    // convert the cartItems to orderItems
    const orderItems = user.cart.map((cartItem) => {
      const orderItem = {
        ...cartItem.item,
        quantity: cartItem.quantity,
        user: { connect: { id: userId } },
      };
      delete orderItem.id;
      return orderItem;
    });

    // create the Order
    const order = await ctx.db.mutation.createOrder({
      data: {
        total: charge.amount,
        charge: charge.id,
        items: { create: orderItems },
        user: { connect: { id: userId } },
        fulfilled: false,
        customerName: args.customerName,
        customerAddress: args.customerAddress,
        customerEmail: args.customerEmail,
      },
    });

    // clean up - clear cart, delete cartItems
    const cartItemIds = user.cart.map((cartItem) => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({
      where: { id_in: cartItemIds },
    });
    // return the Order to the client

    const dev = process.env.NODE_ENV == "dev" ? true : false;

    const locals = {
      admin: false,
      customerName: order.customerName,
      message: customer__order__placed(),
      userData: {
        "Order Page": `${
          dev ? "http://localhost" : "https://beowulf.com"
        }/order?id=${order.id}`,
        "Order ID": order.id,
        "Order Email": order.customerEmail,
        "Shipping Address": order.customerAddress,
      },
      items: orderItems.map((item) => {
        const formattedPrice = formatMoney(item.price);
        item.price = formattedPrice;
        return item;
      }),
      total: formatMoney(charge.amount),
    };

    sendEmail({
      recipient: args.customerEmail,
      subject: "Thank you for your order!",
      template: pugify(locals, "customer__order__placed"),
    });

    sendEmail({
      recipient: process.env.ADMIN_EMAIL,
      subject: "You have recieved a new order!",
      template: pugify(locals, "admin__order__placed"),
    });

    return order;
  },

  async updateOrder(parent, args, ctx, info) {
    const order = await ctx.db.mutation.updateOrder(
      {
        where: { id: args.id },
        data: { fulfilled: args.fulfillment },
      },
      `{ id customerName customerAddress customerEmail items { id title description image largeImage price quantity } }`
    );

    console.log(order);

    const amount = order.items.reduce(
      (totalPrice, cartItem) => totalPrice + cartItem.price * cartItem.quantity,
      0
    );

    const locals = {
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      id: order.id,
      items: order.items.map((item) => {
        const formattedPrice = formatMoney(item.price);
        item.price = formattedPrice;
        return item;
      }),
      total: formatMoney(amount),
      message: yourOrderHasShipped(order.customerName),
    };

    args.fulfillment &&
      sendEmail(
        order.customerEmail,
        "Your order has shipped!",
        pugify(locals, "toCustomer")
      );

    return order;
  },
  async createBlogPost(parent, args, ctx, info) {
    const { user } = ctx.request;
    const { post, title, image, largeImage, imageSizes } = args;
    const excerpt = getExcerpt(post);

    const hasPermissions = user.permissions.some((permission) =>
      ["ADMIN"].includes(permission)
    );
    if (!hasPermissions) throw new Error(err("noPermission"));

    const newPost = await ctx.db.mutation.createBlogPost({
      data: {
        post,
        title,
        excerpt,
        image,
        largeImage,
        imageSizes: { set: imageSizes },
      },
    });

    const previous = await ctx.db.query.blogPosts({
      last: 1,
      before: newPost.id,
    });

    if (previous[0]) {
      ctx.db.mutation.updateBlogPost(
        {
          where: {
            id: newPost.id,
          },
          data: { previous: previous[0].id, previousTitle: previous[0].title },
        },
        info
      );

      ctx.db.mutation.updateBlogPost(
        {
          where: {
            id: previous[0].id,
          },
          data: { next: newPost.id, nextTitle: newPost.title },
        },
        info
      );
    }

    return newPost;
  },

  updateBlogPost(parent, args, ctx, info) {
    const updates = { ...args };
    delete updates.id;
    return ctx.db.mutation.updateBlogPost(
      {
        data: updates,
        where: {
          id: args.id,
        },
      },
      info
    );
  },

  async deleteBlogPost(parent, args, ctx, info) {
    const { userId } = ctx.request;
    const { permissions } = ctx.request.user;
    if (!userId) throw new Error(err("noUser"));
    const hasPermissions = permissions.some((permission) =>
      ["ADMIN", "ITEMDELETE"].includes(permission)
    );
    if (!hasPermissions) throw new Error(err("noPermission"));
    return ctx.db.mutation.deleteBlogPost(
      {
        where: {
          id: args.id,
        },
      },
      info
    );
  },

  async createMessage(parent, args, ctx, info) {
    const { email, message } = args;
    const user = Boolean(await ctx.db.query.user({ where: { email } }));
    const locals = {
      admin: true,
      user,
      message: `"${message}"`,
      userData: {
        "Customer Email": email,
      },
    };
    sendEmail({
      recipient: process.env.ADMIN_EMAIL,
      subject: `You have received a message from site visitor ${email}`,
      template: pugify(locals, "admin__new__message"),
    });
    const newMessage = await ctx.db.mutation.createMessage({
      data: {
        email,
        message,
      },
    });
    return newMessage;
  },
};

module.exports = Mutations;
