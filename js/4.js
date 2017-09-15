const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying lowp vec4 vColor;
    void main() {
    	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

// Fragment shader program
const fsSource = `
    varying lowp vec4 vColor;
    void main() {
    	gl_FragColor = vColor;
    }
`;

var colorVal = 1.0;
var isColorValDecreasing = true;

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function updateBuffers(gl, colorOffset) {
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
         1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
        -1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    if (isColorValDecreasing) {
        colorVal = colorVal - colorOffset;
        if (colorVal < 0.0) {
            colorVal = 0.0 - colorVal;
            isColorValDecreasing = false;
        }
    }
    else {
        colorVal = colorVal + colorOffset;
        if (colorVal > 1.0) {
            colorVal = 2.0 - colorVal;
            isColorValDecreasing = true;
        }
    }
    var colors = [
        colorVal,  1.0 - colorVal,  1.0,  1.0,
        colorVal,  1.0 - colorVal,  0.0,  1.0,
        0.0,  colorVal,  1.0 - colorVal,  1.0,
        1.0 - colorVal,  0.0,  colorVal,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    return {
        position: positionBuffer,
        color: colorBuffer
    };
}

function drawScene(gl, programInfo, buffers) {

	// Clear the Canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);    // Clear to black, fully opaque
    gl.clearDepth(1.0);                                 // Clear everything
    gl.enable(gl.DEPTH_TEST);                     // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                        // Near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Set the projection matrix:
    // 45 degrees angle of view, z-range 0.1 ~ 100.0, keep screen aspect ratio
    const angleOfView = 45 * Math.PI / 180;     // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, angleOfView, aspect, zNear, zFar);

    // Set the model view matrix:
    // Camera position at (0, 0, -6)
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);

    // Pull positions from the position buffer and put into the vertexPosition attribute.
    {
        const numComponents = 2;    // pull out 2 values per iteration
        const type = gl.FLOAT;      // the data in the buffer is 32bit floats
        const normalize = false;    // don't normalize
        const stride = 0;           // how many bytes to get from one set of values to the next
        const offset = 0;           // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }
    
    // Pull colors from the color buffer and put into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray( programInfo.attribLocations.vertexColor);
    }
    
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
	// In this example, projection and model view matrices are passed as uniforms.
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

	// Draw a rectangle
    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

function main() {

    // Get GL context and create GL object
    const canvas = $('#glCanvas')[0];
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    // Initialize shader programs
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Setup shader input locations
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };
    
    var start = null;
    
    // Here's where we call the routine that builds all the objects we'll be drawing.
    function render(now) {
        if (!start) start = now;
        var colorOffset = (now - start) / 1000.0;
        start = now;
        var buffers = updateBuffers(gl, colorOffset);
        drawScene(gl, programInfo, buffers);
        window.requestAnimationFrame(render);
    }
    
    window.requestAnimationFrame(render);

}


