package com.whitelisthub.api.model;

import com.google.gson.annotations.SerializedName;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WhitelistEntry {
    
    @SerializedName("uuid")
    private String uuid;
    
    @SerializedName("name")
    private String name;
}
