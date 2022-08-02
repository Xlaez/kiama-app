import { Request, Response } from "express";
import { uploadToCloud } from "../../libs/cloudinary";
import joiValidation from "../../libs/joiValidation";
import productModel, { IProduct } from "../../model/collections/Product.Model";
import shopModel from "../../model/collections/Shop.Model";
import AppResponse from "../../services/index";

class ProductCntrl {
  constructor() {}

  async createProduct(req: Request, res: Response) {
    const shopId = req.get("x-shop-id");
    const body = req.body;

    const { error } = joiValidation.productCreationValidation(body);

    if (!req.file) return AppResponse.noFile(res);
    if (error) return AppResponse.fail(res, error);

    try {
      const { public_id, secure_url } = await uploadToCloud(req.file.path);

      let newPrice: String;

      if (body.discount > 0) {
        const p = Math.floor((+body.initPrice * body.discount) / 100);
        newPrice = (+body.initPrice - p).toString();
      } else {
        newPrice = body.initPrice;
      }

      const data = {
        ...body,
        image: {
          publicId: public_id,
          url: secure_url,
        },
        shopId,
        newPrice,
        specs: {
          color: body.color,
          extraInfo: body.extraInfo,
        },
      };
      const product = await productModel.create(data);
      await shopModel.findByIdAndUpdate(shopId, {
        $push: { products: product._id },
      });
      AppResponse.created(res, product);
    } catch (e) {
      AppResponse.fail(res, e);
    }
  }

  async getProducts(req: Request, res: Response) {
    const { shopId } = req.params;

    try {
      const products = await productModel.find({ shopId }).lean();

      if (!products) return AppResponse.notFound(res);

      AppResponse.success(res, products);
    } catch (e) {
      AppResponse.fail(res, e);
    }
  }

  async editProducts(req: Request, res: Response) {
    const { body } = req;
    const { error } = joiValidation.productEditValidation(body);

    if (error) return AppResponse.fail(res, error);

    try {
      await productModel.findByIdAndUpdate(body.productId, body);
      return AppResponse.updated(res, "updated");
    } catch (e) {
      AppResponse.fail(res, e);
    }
  }
}

export default new ProductCntrl();
