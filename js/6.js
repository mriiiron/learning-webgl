const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying highp vec2 vTextureCoord;
    void main() {
    	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`;

// Fragment shader program
const fsSource = `
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
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

function loadImages(urlArray) {
    var newImages = [], loadedCount = 0;
    var callBack = function () {};
    function imageLoaded() {
        loadedCount++;
        if (loadedCount == urlArray.length) {
            callBack(newImages);
        }
    }
    for (var i = 0; i < urlArray.length; i++) {
        newImages[i] = new Image();
        newImages[i].src = urlArray[i];
        newImages[i].onload = function () {
            imageLoaded();
        }
        newImages[i].onerror = function () {
            console.log('[WARNING] "' + urlArray[i] + '" load failed.');
            imageLoaded();
        }
    }
    return {
        done: function (userFunction) {
            callBack = userFunction || callBack;
        }
    }
}

function loadTexture(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);  // Use NEAREST for both texture magnification and minification to keep texture sharp
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);  // Do not generate Mipmap or using LINEAR since we need sharp textures
    return texture;
}

function init(gl, programInfo) {
    
    // Set clearing values
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Set the projection matrix:
    // Create a orthogonal projection matrix for 640x480 viewport
    const left = -320;
    const right = 320;
    const bottom = -240;
    const top = 240;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, left, right, bottom, top, zNear, zFar);

    // Set the model view matrix:
    // Camera position at (0, 0, -6)
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
    
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);
    
    // Set the shader uniforms
	// In this example, projection and model view matrices are passed as uniforms.
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    
    // Tell WebGL we want to affect texture unit 0 and bound the texture to texture unit 0 (gl.TEXTURE0)
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
    
    // Turn on attribute array
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    
}

function drawScene(gl, programInfo, texture, buffer) {

	// Clear the Canvas   
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Data is supposed to be updated every frame
    var data = {
        positions: null,
        texCoords: null,
        indices: null
    }
    
    // Batch 1
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.positions);
    data.positions = [
        -96.0,  32.0,
        -32.0,  32.0,
        -96.0,  96.0,
        -32.0,  96.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.texCoords);
    data.texCoords = [
        0.0,  1.0,
        1.0,  1.0,
        0.0,  0.0,
        1.0,  0.0
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
    data.indices = [
        0, 1, 2,
        1, 2, 3
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture[0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    
    // Batch 2
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.positions);
    data.positions = [
         32.0,  32.0,
         96.0,  32.0,
         32.0,  96.0,
         96.0,  96.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.texCoords);
    data.texCoords = [
        0.0,  1.0,
        1.0,  1.0,
        0.0,  0.0,
        1.0,  0.0
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
    data.indices = [
        0, 1, 2,
        1, 2, 3
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture[1]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
    
    // Batch 3
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.positions);
    data.positions = [
        -96.0, -96.0,
        -32.0, -96.0,
        -96.0, -32.0,
        -32.0, -32.0,
         32.0, -96.0,
         96.0, -96.0,
         32.0, -32.0,
         96.0, -32.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.texCoords);
    data.texCoords = [
        0.0,  1.0,
        0.5,  1.0,
        0.0,  0.0,
        0.5,  0.0,
        0.5,  1.0,
        1.0,  1.0,
        0.5,  0.0,
        1.0,  0.0
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
    data.indices = [
        0, 1, 2,
        1, 2, 3,
        4, 5, 6,
        5, 6, 7
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture[2]);
    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);

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
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        }
    };

    init(gl, programInfo);
    
    var buffer = {
        positions: gl.createBuffer(),
        texCoords: gl.createBuffer(),
        indices: gl.createBuffer()
    }

    const texUrl1 = './assets/texture/tex1.png';
    const texUrl2 = './assets/texture/tex2.png';
    const texUrl3 = './assets/texture/tex3.png';
    loadImages([texUrl1, texUrl2, texUrl3]).done(function (newImages) {
        
        texture = [];
        for (var i = 0; i < newImages.length; i++) {
            texture[i] = loadTexture(gl, newImages[i]);
        }
        
        // Main Loop
        var start = null;
        function render(now) {
            if (!start) start = now;
            var timeElapsed = (now - start) / 1000.0;
            start = now;
            drawScene(gl, programInfo, texture, buffer);
            window.requestAnimationFrame(render);
        }
        window.requestAnimationFrame(render);
        
    });
    

    
    
    
}


