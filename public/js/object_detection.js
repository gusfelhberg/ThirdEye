/*
Example script for TensorFlow.js model exported from Custom Vision Service.

HTML example:
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.0.0/dist/tf.min.js"></script>
    <img id="img" crossOrigin src="input.jpg" width=416 height=416 />
    <script src="object_detection.js"></script>
    <script src="app.js"></script>

Javascript example:
    let model = new ObjectDetection();
    await model.load_model('model.json');
    const img_element = document.getElementById('img');
    const inputs = tf.browser.fromPixels(img_element).expandDims().toFloat();
    const results = await model.predict(inputs);
*/

class ObjectDetection {
    ANCHORS = [0.573, 0.677, 1.87, 2.06, 3.34, 5.47, 7.88, 3.53, 9.77, 9.17];

    async load_model(model_path) {
        this.model = await tf.loadGraphModel(model_path);
    }

    // The input needs to be (1, 416, 416, 3) float tensor.
    async predict(input) {
        console.log(input)
        const output_tensor =  await this.model.execute(input);
        return  (async () => {
                       this.postprocess(await output_tensor.array());
                    })();
        //await this.postprocess(await output_tensor.array());
    }

    async postprocess(prediction) {
        const num_anchor = this.ANCHORS.length / 2;
        const channels = prediction[0][0][0].length;
        const height = prediction[0].length;
        const width = prediction[0][0].length;

        const num_class = channels / num_anchor - 5;

        let boxes = [];
        let scores = [];
        let classes = [];

        for (var grid_y = 0; grid_y < height; grid_y++) {
            for (var grid_x = 0; grid_x < width; grid_x++) {
                let offset = 0;

                for (var i = 0; i < num_anchor; i++) {
                    let x = (this._logistic(prediction[0][grid_y][grid_x][offset++]) + grid_x) / width;
                    let y = (this._logistic(prediction[0][grid_y][grid_x][offset++]) + grid_y) / height;
                    let w = Math.exp(prediction[0][grid_y][grid_x][offset++]) * this.ANCHORS[i * 2] / width;
                    let h = Math.exp(prediction[0][grid_y][grid_x][offset++]) * this.ANCHORS[i * 2 + 1] / height;

                    let objectness = tf.scalar(this._logistic(prediction[0][grid_y][grid_x][offset++]));
                    let class_probabilities = tf.tensor1d(prediction[0][grid_y][grid_x].slice(offset, offset + num_class)).softmax();
                    offset += num_class;

                    class_probabilities = class_probabilities.mul(objectness);
                    let max_index = class_probabilities.argMax();
                    boxes.push([x - w / 2, y - h / 2, x + w / 2, y + h / 2]);
                    scores.push(class_probabilities.max().dataSync()[0]);
                    classes.push(max_index.dataSync()[0]);
                }
            }
        }

        boxes = tf.tensor2d(boxes);
        scores = tf.tensor1d(scores);
        classes = tf.tensor1d(classes);

        const selected_indices = await tf.image.nonMaxSuppressionAsync(boxes, scores, 10);
        return [boxes.gather(selected_indices), scores.gather(selected_indices), classes.gather(selected_indices)];
    }

    _logistic(x) {
        if (x > 0) {
            return (1 / (1 + Math.exp(-x)));
        } else {
            const e = Math.exp(x);
            return e / (1 + e);
        }
    }
}
