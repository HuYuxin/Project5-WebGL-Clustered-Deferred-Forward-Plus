import { mat4, vec4, vec3 } from 'gl-matrix';
import { NUM_LIGHTS } from '../scene';
import TextureBuffer from './textureBuffer';

export const MAX_LIGHTS_PER_CLUSTER = 300;

export default class ClusteredRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

  updateClusters(camera, viewMatrix, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...

    //Clear the clusterTextureBuffer
    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0) + 0] = 0;
        }
      }
    }

    // console.log(this._zSlices, this._ySlices, this._xSlices)

    //var zinterval = (camera.far - camera.near)/this._zSlices;
    //For better cluster result, set the z length of each cluster to be n, such that n^_zSlices = zRange
    var zinterval = Math.exp(Math.log(camera.far - camera.near)/this._zSlices);
    var nearPlaneZ = camera.near;
    var farPlaneZ = camera.far;
    var frustrumMaxY = farPlaneZ* Math.tan((camera.fov/2)*Math.PI/180)*2;
    var yIntervalMax = frustrumMaxY/this._ySlices;
    var frustrumMaxX = frustrumMaxY*camera.aspect;
    var xIntervalMax = frustrumMaxX/this._xSlices;
    //debugger;
    for (let lightIndex = 0; lightIndex < NUM_LIGHTS; ++lightIndex) {
      
      var minX=0, maxX=this._xSlices-1, minY=0, maxY=this._ySlices-1, minZ=0, maxZ=this._zSlices-1;
      //get the vector from camera origin to light center
      let lightPosVec4 = vec4.create();
      lightPosVec4[0]=scene.lights[lightIndex].position[0];
      lightPosVec4[1]=scene.lights[lightIndex].position[1];
      lightPosVec4[2]=scene.lights[lightIndex].position[2];
      lightPosVec4[3]=1;

      let lightPosCamera = vec4.create();
      vec4.transformMat4(lightPosCamera,lightPosVec4,viewMatrix);

      let lightPos = vec3.create();
      lightPos[0]=lightPosCamera[0];
      lightPos[1]=lightPosCamera[1];
      lightPos[2]=-lightPosCamera[2];

      let lightRadius = scene.lights[lightIndex].radius;

      let minXFound = false;
      let maxXFound = false;
      let minYFound = false;
      let maxYFound = false;
      let minZFound = false;
      let maxZFound = false;
      //Test against xPlanes
      for(let xPlaneIdx=0;xPlaneIdx<this._xSlices;xPlaneIdx++){
        if(!minXFound || !maxXFound){
          let faceNormal = vec3.create();
          //debugger;
          let xFaceVec1 = vec3.create();
          xFaceVec1[0]=-frustrumMaxX/2 + xPlaneIdx*xIntervalMax;
          xFaceVec1[1]=frustrumMaxY/2;
          xFaceVec1[2]=farPlaneZ;
          let xFaceVec2 = vec3.create();
          xFaceVec2[0]=-frustrumMaxX/2 + xPlaneIdx*xIntervalMax;
          xFaceVec2[1]=-frustrumMaxY/2;
          xFaceVec2[2]=farPlaneZ;
          vec3.cross(faceNormal, xFaceVec1,xFaceVec2);
          vec3.normalize(faceNormal,faceNormal);
          let lightDistanceToPlane=vec3.dot(lightPos,faceNormal);
          //debugger;
          if(lightDistanceToPlane>0){
            if((lightDistanceToPlane < lightRadius) && (!minXFound)){
              if(xPlaneIdx>=1){
                minX = xPlaneIdx-1;
              }
             
              minXFound = true;
            }
          }else{
            if(!minXFound){
              if(xPlaneIdx>=1){
                minX = xPlaneIdx-1;
              }              
              minXFound = true;
            }
            if(-lightDistanceToPlane > lightRadius && !maxXFound){
              maxX = xPlaneIdx;
              maxXFound = true;
            }
          }
        }else{
          //Both minX and maxX planes have been found, ternimate the loop
          break;
        }
      }
      if(!minXFound){
        minX = this._xSlices-1;
      }


      //debugger;
      //Test against YPlanes
      for(let yPlaneIdx=0; yPlaneIdx<this._ySlices; yPlaneIdx++){
        if(!minYFound || !maxYFound){
          let faceNormal = vec3.create();
          let yFaceVec1 = vec3.create();
          yFaceVec1[0]=-frustrumMaxX/2;
          yFaceVec1[1]=-frustrumMaxY/2 + yPlaneIdx*yIntervalMax;
          yFaceVec1[2]=farPlaneZ;
          let yFaceVec2 = vec3.create();
          yFaceVec2[0]=frustrumMaxX/2;
          yFaceVec2[1]=-frustrumMaxY/2 + yPlaneIdx*yIntervalMax;
          yFaceVec2[2]=farPlaneZ;
          vec3.cross(faceNormal, yFaceVec1,yFaceVec2);
          vec3.normalize(faceNormal,faceNormal);
          let lightDistanceToPlane=vec3.dot(lightPos,faceNormal);
          if(lightDistanceToPlane>0){
            if(lightDistanceToPlane < lightRadius && !minYFound){
              if(yPlaneIdx>=1){
                minY = yPlaneIdx-1;
              }
              minYFound = true;
            }
          }else{
            if(!minYFound){
              if(yPlaneIdx>=1){
                minY = yPlaneIdx-1;
              }
              minYFound = true;
            }
            if(-lightDistanceToPlane > lightRadius && !maxYFound){
              maxY = yPlaneIdx;
              maxYFound = true;
            }
          }
        }else{
          //Both minY and maxY planes have been found, ternimate the loop
          break;
        }
      }
    
      if(!minYFound){
        minY = this._ySlices-1;
      }

     //Test against ZPlanes
     for(let zPlaneIdx=0; zPlaneIdx<this._zSlices; zPlaneIdx++){
      if(!minZFound || !maxZFound){
        //let lightDistanceToPlane = lightPos[2] - (nearPlaneZ + zPlaneIdx*zinterval);
        let lightDistanceToPlane = lightPos[2] - (nearPlaneZ + Math.pow(zinterval,zPlaneIdx));
        if(lightDistanceToPlane>0){
          if(lightDistanceToPlane < lightRadius && !minZFound){
            if(zPlaneIdx>=1){
              minZ = zPlaneIdx-1;
            }    
            minZFound = true;
          }
        }else{
          if(!minZFound){
            if(zPlaneIdx>=1){
              minZ = zPlaneIdx-1;
            }            
            minZFound = true;
          }
          if(-lightDistanceToPlane > lightRadius && !maxZFound){
            maxZ = zPlaneIdx;
            maxZFound = true;
          }
        }
      }else{
        //Both minZ and maxZ planes have been found, ternimate the loop
        break;
      }
    }

    if(!minZFound){
      minZ = this._zSlices-1;
    }
    //debugger;
    var rowShift = 0;
    var pixelShift = 0;
    var lightCount = 0;
    //debugger;
    for (let zBufferIdx = minZ; zBufferIdx <= maxZ; ++zBufferIdx) {
      for (let yBufferIdx = minY; yBufferIdx <= maxY; ++yBufferIdx) {
        for (let xBufferIdx = minX; xBufferIdx <= maxX; ++xBufferIdx) {
          let i = xBufferIdx + yBufferIdx * this._xSlices + zBufferIdx * this._xSlices * this._ySlices;         
          lightCount =   this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0) + 0];
          lightCount++;     
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0) + 0] = lightCount;
          rowShift = Math.floor(lightCount/4); 
          pixelShift = lightCount-rowShift*4;
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, rowShift) + pixelShift] = lightIndex;
        }
      }
    }
    //console.log(minX, maxX)
    //debugger;
  }
  this._clusterTexture.update();
}
}