const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../util/utils");
const err = require("../util/err");

const Query = {
  items: forwardTo("db"),
  item: forwardTo("db"),
  blogPosts: forwardTo("db"),
  blogPost: forwardTo("db"),
  itemsConnection: forwardTo("db"),

  async me(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      return null;
    }
    return await ctx.db.query.user({ where: { id: ctx.request.userId } }, info);
  },

  async users(parent, args, ctx, info) {
    if (!ctx.request.userId) throw new Error(err("noPermission"));
    hasPermission(ctx.request.user, ["ADMIN", "PERMISSIONUPDATE"]);

    return ctx.db.query.users({}, info);
  },

  async order(parent, args, ctx, info) {
    if (!ctx.request.userId) throw new Error(err("noUser"));
    const order = await ctx.db.query.order({ where: { id: args.id } }, info);
    const ownsOrder = order.user.id === ctx.request.userId;
    //const hasPermission = ctx.request.user.permissions.includes("ADMIN");
    if (!ownsOrder) {
      throw new Error(err("noPermission"));
    }
    return order;
  },

  async orders(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error(err("noUser"));
    }
    let orders = await ctx.db.query.orders(
      { where: { id: ctx.request.id } },
      info
    );
    return orders;
  },
  async adminEmail(parent, args, ctx, info) {
    let adminEmail = `${process.env.ADMIN_EMAIL}`;
    return { someString: adminEmail };
  }
};

module.exports = Query;
